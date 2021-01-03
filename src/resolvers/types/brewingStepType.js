const brewingStepType = {
  async graphs(parent, args, ctx) {
    return await ctx.prisma.graph.findMany({
      where: { brewingStepId: parent.id }
    });
  },

  async mediaStreams(parent, args, ctx) {
    return await ctx.prisma.mediaStream.findMany({
      where: { brewingStepId: parent.id }
    });
  },

  async brewingProcess(parent, args, ctx) {
    return await ctx.prisma.brewingProcess.findUnique({
      where: { id: parent.brewingProcessId }
    });
  },

};

module.exports = { brewingStepType };
