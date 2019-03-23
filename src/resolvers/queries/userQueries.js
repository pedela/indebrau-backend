const userQueries = {
  async me(parent, args, ctx, info) {
    console.log(ctx.request.user.id);
    return await ctx.db.query.user(
      { where: { id: ctx.request.user.id } },
      info
    );
  }
};

module.exports = { userQueries };
