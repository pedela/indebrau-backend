const { checkUserPermissions } = require('../../utils/checkUserPermissions');

const mediaStreamQueries = {
  async mediaStreams(parent, { active }, ctx, info) {
    checkUserPermissions(ctx, ['ADMIN']);
    let activeStreams = null;
    if (active) {
      activeStreams = { active: active };
    }
    const mediaStreams = await ctx.prisma.mediaStream.findMany(
      {
        where: { ...activeStreams }
      },
      info
    );
    console.log(mediaStreams);
    return mediaStreams;
  },

  async mediaStream(parent, { id }, ctx, info) {
    checkUserPermissions(ctx, ['USER'], undefined, id);
    const mediaStream = await ctx.prisma.mediaStream.findOne(
      { where: { id: id } },
      info
    );
    return mediaStream;
  }
};

module.exports = { mediaStreamQueries };
