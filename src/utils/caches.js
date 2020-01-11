/* Helper function that caches active graphs (to speed up inserts). */
var cachedActiveGraphs = null;
async function activeGraphCache(ctx, update) {
  if (cachedActiveGraphs == null || update) {
    console.log('refreshing active graph list...');
    cachedActiveGraphs = await ctx.db.query.graphs(
      { where: { active: true } },
      `{
      id, sensorName, active, updateFrequency
      }`
    );
  }
  return cachedActiveGraphs;
}

/* Helper function that caches active media streams (to speed up inserts). */
var cachedMediaStreams = null;
async function activeMediaStreamsCache(ctx, update) {
  if (cachedMediaStreams == null || update) {
    console.log('refreshing active media stream list...');
    cachedMediaStreams = await ctx.db.query.mediaStreams(
      { where: { active: true } },
      `{
      id, mediaFilesName, active, updateFrequency, brewingSteps, overwrite, brewingProcess { id }
      }`
    );
  }
  return cachedMediaStreams;
}

module.exports = {
  activeGraphCache,
  activeMediaStreamsCache,
};
