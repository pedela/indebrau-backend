const {
  checkUserPermissions
} = require('../../utils');

const brewingProcessQueries = {
  async brewingProcesses(parent, args, ctx, info) {
    checkUserPermissions(ctx, ['USER', 'ADMIN']);
    // fetch from cache
    return await ctx.db.query.brewingProcesses({}, info);
  }
};

module.exports = { brewingProcessQueries };
