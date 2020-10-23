const { activeGraphCache, activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { deleteMediaFolder } = require('../../utils/mediaFileHandling');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let input = {
      name: args.name,
      description: args.description,
    };
    // start with preparing state (if startNow is true)
    if (args.startNow) {
      input.start = new Date().toJSON();
      input.brewingSteps = {
        create: { name: 'PREPARING', start: input.start }
      };
    }
    return await ctx.prisma.brewingProcess.create({
      data: { ...input }
    });
  },

  async advanceBrewingProcess(parent, { brewingProcessId }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };
    //we only need the steps here
    let brewingProcess = await ctx.prisma.brewingProcess.findOne(
      { where, select: { end: true, brewingSteps: {} } }
    );
    if (!brewingProcess) {
      throw new Error('Cannot find brewing process with id ' + brewingProcessId);
    } else if (brewingProcess.end) {
      throw new Error('Brewing process with id ' + brewingProcessId + ' has already ended!');
    }
    // advance process, based on previous steps (length of array)
    let data = {};
    let now = new Date().toJSON();
    switch (brewingProcess.brewingSteps.length) {
      case (0): {
        data.start = now;
        data.brewingSteps = { create: { name: 'PREPARING', start: now } };
        break;
      }
      case (1): {
        data.brewingSteps = {
          create: { name: 'BREWING', start: now },
          updateMany: {
            data: { end: now },
            where: { name: 'PREPARING' },
          },
        };
        break;
      }
      case (2): {
        data.brewingSteps = {
          create: { name: 'FERMENTING', start: now },
          updateMany: {
            data: { end: now },
            where: { name: 'BREWING' },
          },
        };
        break;
      }
      case (3): {
        data.brewingSteps = {
          create: { name: 'CONDITIONING', start: now },
          updateMany: {
            data: { end: now },
            where: { name: 'FERMENTING' },
          },
        };
        break;
      }
      case (4): {
        data.brewingSteps = {
          create: { name: 'BOTTLING', start: now },
          updateMany: {
            data: { end: now },
            where: { name: 'CONDITIONING' },
          },
        };
        break;
      }
      // Process ended, no bottles remaining
      case (5): {
        data.brewingSteps = {
          updateMany: {
            data: { end: now },
            where: { name: 'BOTTLING' },
          },
        };
        data.end = now;
        data.bottlesAvailable = 0;
        break;
      }
    }
    // graphs and media streams could become inactive through this action..
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);

    return await ctx.prisma.brewingProcess.update({ where, data });
  },

  async changeBottlesAvailable(parent, { brewingProcessId, bottlesAvailable }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };
    const data = { bottlesAvailable: bottlesAvailable };

    let brewingProcess = await ctx.prisma.brewingProcess.findOne({ where });
    if (!brewingProcess) {
      throw new Error('Cannot find brewing process with id ' + brewingProcessId);
    }
    if (!brewingProcess.end) {
      throw new Error('Brewing process with id' + brewingProcessId + ' not ended yet!');
    }
    return await ctx.prisma.brewingProcess.update({ where, data });
  },

  async deleteBrewingProcess(parent, { brewingProcessId }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    // delete and return steps to delete folders afterwards
    const { brewingSteps } = await ctx.prisma.brewingProcess.delete({
      where: { id: parseInt(brewingProcessId) },
      select: { brewingSteps: {} }
    });
    // update caches (associated graphs and streams are deleted cascadingly)
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    for (let i = 0; i < brewingSteps.length; i++) {
      try {
        await deleteMediaFolder(brewingSteps[i].id);
      } catch (e) {
        throw new Error('Problems deleting media folders for brewing process ' + brewingProcessId);
      }
    }
    return { message: 'Deleted!' };
  }
};

module.exports = { brewingProcessMutations };
