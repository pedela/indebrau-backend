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

  async deleteBrewingProcess(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: args.id };
    const deletedBrewingProcess = await ctx.db.mutation.deleteBrewingProcess({ where }, info);
    // update cache (associated graphs might be deleted cascadingly)
    await activeGraphCache(ctx, true);
    if (!deletedBrewingProcess) {
      throw new Error('Problem deleting brewing process');
    }
    return deletedBrewingProcess;
  }
};

module.exports = { brewingProcessMutations };
