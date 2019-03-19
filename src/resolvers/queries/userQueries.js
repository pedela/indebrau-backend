const userQueries = {
  async me(parent, args, ctx) {
    return ctx.request.user;
  }
};

module.exports = { userQueries };
