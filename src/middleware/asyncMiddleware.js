export default function asyncMiddleware(func) {
  return (req, res, next) =>
    Promise
    .resolve(func(req, res, next))
    .catch(next);
}