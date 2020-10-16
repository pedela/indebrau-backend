const userQueries = {
  async me(parent, args, ctx, info) {
    // not logged in
    if (!ctx.req.user) return null;
    return await ctx.prisma.user.findOne(
      { where: { id: ctx.req.user.id } },
      info
    );
  }
};

module.exports = { userQueries };
