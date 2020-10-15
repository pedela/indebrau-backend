const {
  activeGraphCache,
  activeMediaStreamsCache
} = require('../../utils/caches');
const { checkUserPermissions } = require('../../utils/checkUserPermissions');
const { deleteMediaFolder } = require('../../utils/mediaFileHandling');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let start = null;
    if (args.start_now) {
      start = new Date().toJSON();
    }
    let input = {
      name: args.name,
      description: args.description,
      start: start
    };

    // and send to db
    const createdBrewingProcess = await ctx.prisma.brewingProcess.create({
      data: {
        ...input
      }
    });
    if (!createdBrewingProcess) {
      throw new Error('problem creating brewing process');
    }
    return createdBrewingProcess;
  },

  async advanceBrewingProcess(parent, { id, new_active_steps }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(id) };
    let activeStepsQueryResult = await ctx.prisma.brewingProcess.find(
      where,
      '{ active_steps }'
    );
    if (!activeStepsQueryResult) {
      throw new Error('Cannot find brewing process with id ' + id);
    }
    let { activeSteps } = activeStepsQueryResult;

    // TODO: I guess here has to be a lot of logic (and additional arguments passed in the mutation)
    // for now, let's settle by only updating the steps
    // 1. remove finished steps
    for (let i = 0; i < activeSteps.length; i++) {
      if (!new_active_steps.includes(activeSteps[i])) {
        activeSteps.splice(activeSteps.indexOf(activeSteps[i]), 1);
      }
    }
    // 2. add new active steps
    for (let i = 0; i < new_active_steps.length; i++) {
      if (!activeSteps.includes(new_active_steps[i])) {
        activeSteps.push(new_active_steps[i]);
      }
    }
    const data = { active_steps: { set: activeSteps } };
    return await ctx.prisma.brewingProcess.update({ where, data }, info);
  },

  async deleteBrewingProcess(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    const where = { id: parseInt(args.id) };
    const deletedBrewingProcess = await ctx.prisma.brewingProcess.delete(
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
    await deleteMediaFolder(parseInt(args.id));
    return deletedBrewingProcess;
  }
};

module.exports = { brewingProcessMutations };
