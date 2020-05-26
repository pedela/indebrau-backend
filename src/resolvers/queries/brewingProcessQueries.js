const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const brewingProcessQueries = {
  async brewingProcesses(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    return await ctx.db.query.brewingProcesses({}, info);
  },

  async brewingProcess(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['USER'], args.id);
    return await ctx.db.query.brewingProcess({ where: { id: args.id } }, info);
  }
};

module.exports = { brewingProcessQueries };
