export default function handler(req, res) {
  const { nftId } = req.query;
  const str = nftId ? nftId + '' : '0';
  const nftCode = str.padStart(4, "0");
  return res.json({
    name: 'Minertopia #' + nftCode,
    image: 'https://res.cloudinary.com/dmyum8dv5/image/upload/f_auto,q_auto/v1/minertopia/card' + nftId + '.png',
  });
}
