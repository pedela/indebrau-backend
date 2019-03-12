const userQueries = {
  async me(parent, args, ctx, info) {
    const id = ctx.request.userId;
    if (!id) {
      throw new Error('You must be logged in to do that!');
    }
    return ctx.db.query.user({ where: { id } }, info);
  }
};

module.exports = { userQueries };
