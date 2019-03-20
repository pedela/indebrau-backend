const {
  checkUserPermissions
} = require('../../utils');

const brewingProcessQueries = {
  async brewingProcesses(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    return await ctx.db.query.brewingProcesses({}, info);
  }
};

module.exports = { brewingProcessQueries };
