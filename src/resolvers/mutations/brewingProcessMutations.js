const { activeGraphCache, checkUserPermissions } = require('../../utils');

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
  async advanceBrewingProcess(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: args.id };
    let { activeSteps } = await ctx.db.query.brewingProcess(
      { where: { id: args.id } },
      '{ activeSteps }'
    );
    let newActiveSteps = args.newActiveSteps;
    let finishedSteps = args.finishedSteps;
    // I guess here has to be a lot of logic (and additional arguments passed in the mutation)
    // for now, let's settle by updating the steps alone
    if (!newActiveSteps) {
      newActiveSteps = [];
    }
    if (!finishedSteps) {
      finishedSteps = [];
    }
    for (let i = 0; i < finishedSteps.length; i++) {
      if (!activeSteps.includes(finishedSteps[i])) {
        throw new Error('Step was not active ' + finishedSteps[i]);
      }
      if (newActiveSteps.includes(finishedSteps[i])) {
        throw new Error('Cannot remove and add same step ' + finishedSteps[i]);
      }

      activeSteps.splice(activeSteps.indexOf(finishedSteps[i]), 1);
    }
    for (let i = 0; i < newActiveSteps.length; i++) {
      if (activeSteps.includes(newActiveSteps[i])) {
        throw new Error('Step was already active ' + newActiveSteps[i]);
      }
      activeSteps.push(newActiveSteps[i]);
    }
    console.log(activeSteps);
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
    // update cache (associated graphs might be deleted cascadingly)
    await activeGraphCache(ctx, true);
    if (!deletedBrewingProcess) {
      throw new Error('Problem deleting brewing process');
    }
    return deletedBrewingProcess;
  }
};

module.exports = { brewingProcessMutations };
