const brewingProcessMutations = {
  async createBrewingProcess(parent, args, ctx) {
    if (!ctx.request.userId) {
      throw new Error('You must be logged in to do that!');
    }
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
