const { checkUserPermissions } = require('../../utils');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // provide default start date
    let start = new Date().toJSON();
    if (args.start) {
      start = args.start;
    }
    // a bit of hickhack to get the format right..
    let details = args.brewingProcessDetails;
    for (var i = 0 ; i < details.boilHopAdditions.length; i++) {
      details.boilHopAdditions[i] = {
        minutesAfterBoilStart:
          details.boilHopAdditions[i].minutesAfterBoilStart,
        hop: { create: details.boilHopAdditions[i].hop }
      };
    }
    let input = {
      name: args.name,
      start: start,
      description: args.description,
      brewingProcessDetails: {
        create: {
          ...details,
          malts: { create: details.malts },
          yeast: { create: details.yeast },
          mashSteps: { create: details.mashSteps },
          fermentationSteps: { create: details.fermentationSteps },
          boilHopAdditions: { create: details.boilHopAdditions }
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
  }
};

module.exports = { brewingProcessMutations };
