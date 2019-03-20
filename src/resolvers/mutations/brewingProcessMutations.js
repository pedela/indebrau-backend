const {
  activeBrewingProcessesCache,
  checkUserPermissions
} = require('../../utils');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);

    const createdBrewingProcess = await ctx.db.mutation.createBrewingProcess({
      data: {
        name: args.name,
        start: new Date().toJSON(),
        active: true
      }
    });
    // update cache
    await activeBrewingProcessesCache(ctx, true);
    if (!createdBrewingProcess) {
      throw new Error('problem creating brewing process');
    }
    return createdBrewingProcess;
  }
};

module.exports = { brewingProcessMutations };
