const userQueries = {
  async me(parent, args, ctx, info) {
    return ctx.request.user;
  }
};

module.exports = { userQueries };
