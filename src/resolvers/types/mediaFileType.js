const mediaFileType = {
  async mediaStream(parent, args, ctx) {
    return await ctx.prisma.mediaStream.findUnique({
      where: { id: parent.mediaStreamId }
    });
  }
};

module.exports = { mediaFileType };
