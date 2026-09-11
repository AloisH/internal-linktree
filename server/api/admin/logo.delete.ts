export default defineEventHandler((event) => {
  const previous = setLogo(useDb(), null);
  removeUpload(previous);
  setResponseStatus(event, 204);
  return null;
});
