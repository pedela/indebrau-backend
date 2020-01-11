const { activeGraphCache, activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { deleteMediaFolder } = require('../../utils/mediaFileHandling');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // a bit of hickhack to get the format right..
    let details = args.brewingProcessDetails;
    for (var i = 0; i < details.boilHopAdditions.length; i++) {
      details.boilHopAdditions[i] = {
        minutesAfterBoilStart:
          details.boilHopAdditions[i].minutesAfterBoilStart,
        hop: { create: details.boilHopAdditions[i].hop }
      };
    }
    let start = null;
    if (args.startNow) {
      start = new Date().toJSON();
    }
    let input = {
      name: args.name,
      description: args.description,
      start: start,
      brewingProcessDetails: {
        create: {
          ...details,
          malts: { create: details.malts },
          yeast: { create: details.yeast },
          mashSteps: { create: details.mashSteps },
          fermentationSteps: { create: details.fermentationSteps },
          boilHopAdditions: { create: details.boilHopAdditions },
          dryHopping: { create: details.dryHopAdditions }
        }
      }
    };

    // and send to db
    const createdBrewingProcess = await ctx.db.mutation.createBrewingProcess({
      data: {
        ...input
      }
    });
    if (!createdBrewingProcess) {
      throw new Error('problem creating brewing process');
    }
    return createdBrewingProcess;
  },

  async advanceBrewingProcess(parent, { id, newActiveSteps }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: id };
    let activeStepsQueryResult = await ctx.db.query.brewingProcess(
      { where: { id: id } },
      '{ activeSteps }'
    );
    if (!activeStepsQueryResult) {
      throw new Error('Cannot find brewing process with id ' + id);
    }
    let { activeSteps } = activeStepsQueryResult;

    // TODO: I guess here has to be a lot of logic (and additional arguments passed in the mutation)
    // for now, let's settle by only updating the steps
    // 1. remove finished steps
    for (let i = 0; i < activeSteps.length; i++) {
      if (!newActiveSteps.includes(activeSteps[i])) {
        activeSteps.splice(activeSteps.indexOf(activeSteps[i]), 1);
      }
    }
    // 2. add new active steps
    for (let i = 0; i < newActiveSteps.length; i++) {
      if (!activeSteps.includes(newActiveSteps[i])) {
        activeSteps.push(newActiveSteps[i]);
      }
    }
    const data = { activeSteps: { set: activeSteps } };
    return await ctx.db.mutation.updateBrewingProcess({ where, data }, info);
  },

  async deleteBrewingProcess(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: args.id };
    const deletedBrewingProcess = await ctx.db.mutation.deleteBrewingProcess(
      { where },
      info
    );
    // update caches (associated graphs and streams are deleted cascadingly)
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);
    if (!deletedBrewingProcess) {
      throw new Error('Problem deleting brewing process');
    }
    // finally, remove media from disk
    await deleteMediaFolder(args.id);
    return deletedBrewingProcess;
  }
};

module.exports = { brewingProcessMutations };
