const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const mediaStreamQueries = {
  async mediaStreams(parent, { active }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    let activeStreams = null;
    if (active) {
      activeStreams = { active: active };
    }
    const mediaStreams = await ctx.db.query.mediaStreams(
      {
        where: { ...activeStreams }
      },
      info
    );
    return mediaStreams;
  },

  async mediaStream(parent, { id }, ctx, info) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    const mediaStream = await ctx.db.query.mediaStream(
      { where: { id: id } },
      info
    );
    return mediaStream;
  }
};

module.exports = { mediaStreamQueries };
