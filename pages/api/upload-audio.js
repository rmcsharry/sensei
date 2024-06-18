import multer from 'multer';
import nextConnect from 'next-connect';

const upload = multer({
  storage: multer.memoryStorage(),
});

const apiRoute = nextConnect({
  onError(error, req, res) {
    res.status(501).json({ error: `Sorry something happened! ${error.message}` });
  },
  onNoMatch(req, res) {
    res.status(405).json({ error: `Method '${req.method}' Not Allowed` });
  },
});

apiRoute.use(upload.single('audioFile'));

apiRoute.post((req, res) => {
  const audioFile = req.file;
  // Your logic to handle the file
  res.status(200).json({ message: 'File uploaded successfully' });
});

export default apiRoute;

export const config = {
  api: {
    bodyParser: false,
  },
};
