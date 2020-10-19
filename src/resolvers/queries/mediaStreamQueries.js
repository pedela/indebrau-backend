const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const mediaStreamQueries = {
  async mediaStreams(parent, { active }, ctx) {
    checkUserPermissions(ctx, ['ADMIN']);
    let activeStreams = null;
    if (active) {
      activeStreams = { active: active };
    }
    const mediaStreams = await ctx.prisma.mediaStream.findMany(
      {
        where: { ...activeStreams }
      }
    );
    return mediaStreams;
  },

  async mediaStream(parent, { id }, ctx) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    const mediaStream = await ctx.prisma.mediaStream.findOne(
      { where: { id: parseInt(id) } }
    );
    return mediaStream;
  }
};

module.exports = { mediaStreamQueries };
