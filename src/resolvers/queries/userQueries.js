const userQueries = {
  async me(parent, args, ctx, info) {
    // not logged in
    if (!ctx.request.user) return null;
    return await ctx.prisma.user.findOne(
      { where: { id: ctx.request.user.id } },
      info
    );
  }
};

module.exports = { userQueries };
