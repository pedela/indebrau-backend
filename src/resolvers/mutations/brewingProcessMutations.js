const { checkUserPermissions } = require('../../utils');

const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['USER', 'ADMIN']);

    const createdBrewingProcess = await ctx.db.mutation.createBrewingProcess({
      data: {
        name: args.name,
        start: new Date().toJSON(),
        active: true
      }
    });
    if (!createdBrewingProcess) {
      throw new Error('problem creating brewing process');
    }
    return createdBrewingProcess;
  }
};

module.exports = { brewingProcessMutations };
