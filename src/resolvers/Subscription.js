const Subscription = {
  graphSubscription: {
    subscribe: (parent, args, ctx, info) => {
      return ctx.db.subscription.graph(
        {
          where: {}
        },
        info
      );
    }
  }
};

module.exports = { Subscription };
