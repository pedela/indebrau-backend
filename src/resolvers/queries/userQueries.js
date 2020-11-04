const { checkUserPermissions } = require('../../utils/checkUserPermissions');


const userQueries = {
  async me(parent, args, ctx) {
    // not logged in
    if (!ctx.req.user) return null;
    return await ctx.prisma.user.findOne({
      where: { id: ctx.req.user.id }
    });
  },

  async users(parent, args, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);

    return await ctx.prisma.user.findMany();
  }
};

module.exports = { userQueries };
