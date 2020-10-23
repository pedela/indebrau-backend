const mediaFileType = {
  async mediaStream(parent, args, ctx) {
    return await ctx.prisma.mediaStream.findOne({
      where: { id: parent.mediaStreamId }
    });
  }
};

module.exports = { mediaFileType };
