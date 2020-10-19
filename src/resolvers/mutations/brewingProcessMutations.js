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

  async advanceBrewingProcess(parent, { id, newActiveSteps }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(id) };
    let activeStepsQuery = await ctx.prisma.brewingProcess.findOne({
      where,
      select: { activeSteps: true }
    });
    let activeSteps = activeStepsQuery.activeSteps;
    if (!activeSteps) {
      throw new Error('Cannot find brewing process with id ' + id);
    }
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
    return await ctx.prisma.brewingProcess.update({ where, data });
  },

  async deleteBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { where: { id: parseInt(args.id) } };
    const deletedBrewingProcess = await ctx.prisma.brewingProcess.delete(where);
    // update caches (associated graphs and streams are deleted cascadingly)
    await activeGraphCache(ctx, true);
    await activeMediaStreamsCache(ctx, true);
    if (!deletedBrewingProcess) {
      throw new Error('Problem deleting brewing process');
    }
    // finally, remove media from disk
    await deleteMediaFolder(parseInt(args.id));
    return { message: 'Deleted!' };
  }
};

module.exports = { brewingProcessMutations };
