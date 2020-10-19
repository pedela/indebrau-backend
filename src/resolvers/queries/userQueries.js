const userQueries = {
  async me(parent, args, ctx) {
    // not logged in
    if (!ctx.req.user) return null;
    return await ctx.prisma.user.findOne({
      where: { id: ctx.req.user.id }
    });
  }
};

module.exports = { userQueries };
