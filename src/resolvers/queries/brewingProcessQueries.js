const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const brewingProcessQueries = {
  async brewingProcesses(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    return await ctx.prisma.brewingProcess.findMany({});
  },

  async brewingProcess(parent, args, ctx) {
    checkUserPermissions(ctx, ['USER'], args.id);
    return await ctx.prisma.brewingProcess.findUnique({
      where: { id: parseInt(args.id) }
    });
  }
};

module.exports = { brewingProcessQueries };
