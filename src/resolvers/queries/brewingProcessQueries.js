const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const brewingProcessQueries = {
  async brewingProcesses(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    return await ctx.prisma.brewingProcess.findMany({}, info);
  },

  async brewingProcess(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['USER'], args.id);
    return await ctx.prisma.brewingProcess.findOne(
      { where: { id: args.id } },
      info
    );
  }
};

module.exports = { brewingProcessQueries };
