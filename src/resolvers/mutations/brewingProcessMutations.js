const { activeGraphCache, activeMediaStreamsCache } = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { deleteMediaFolder } = require('../../utils/mediaFileHandling');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let start = null;
    if (args.startNow) {
      start = new Date().toJSON();
    }
    let input = {
      name: args.name,
      description: args.description,
      start: start
    };
    const createdBrewingProcess = await ctx.prisma.brewingProcess.create({
      data: { ...input }
    });
    if (!createdBrewingProcess) {
      throw new Error('problem creating brewing process');
    }
    return createdBrewingProcess;
  },

  async advanceBrewingProcess(parent, { brewingProcessId, newActiveSteps }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };
    let data = {};
    if (newActiveSteps.length == 0) {
      throw new Error('No new active steps!');
    }
    let brewingProcess;
    try {
      brewingProcess = await ctx.prisma.brewingProcess.findOne({ where });
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
    if (!brewingProcess) {
      throw new Error('Cannot find brewing process with id ' + brewingProcessId);
    }
    if (brewingProcess.end) {
      throw new Error('Brewing process with id ' + brewingProcessId + ' has ended!');
    }
    // start process if not yet started
    if (!brewingProcess.start) {
      data.start = new Date().toJSON();
    }
    // TODO: I guess here has to be a lot of logic (and additional arguments passed in the mutation)
    // for now, let's settle by only updating the steps
    // 1. remove finished steps
    let activeSteps = brewingProcess.activeSteps;
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
    data.activeSteps = { set: activeSteps };
    try {
      return await ctx.prisma.brewingProcess.update({ where, data });
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
  },

  async changeBottlesAvailable(parent, { brewingProcessId, bottlesAvailable }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(brewingProcessId) };
    let brewingProcess;
    try {
      brewingProcess = await ctx.prisma.brewingProcess.findOne({ where });
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
    if (!brewingProcess) {
      throw new Error('Cannot find brewing process with id ' + brewingProcessId);
    }
    let activeSteps = brewingProcess.activeSteps;
    if (brewingProcess.end) {
      throw new Error('Brewing process with id' + brewingProcessId + ' not active!');
    }
    if (!activeSteps.includes('BOTTLED')) {
      throw new Error('Brewing process with id' + brewingProcessId + ' not bottled yet!');
    }
    const data = { bottlesAvailable: bottlesAvailable };
    try {
      return await ctx.prisma.brewingProcess.update({ where, data });
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
  },

  async deleteBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { where: { id: parseInt(args.id) } };
    try {
      await ctx.prisma.brewingProcess.delete(where);
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
    // update caches (associated graphs and streams are deleted cascadingly)
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);
    // finally, remove media from disk
    try {
      await deleteMediaFolder(parseInt(args.id));
    } catch (e) {
      console.log(e);
      throw new Error('Problems querying database');
    }
    return { message: 'Deleted!' };
  }
};

module.exports = { brewingProcessMutations };
