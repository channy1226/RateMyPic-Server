const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const invariant = require('invariant');


const PORT = process.env.PORT || 5000;
let mongoose = require('mongoose');

mongoose.connect(
  process.env.MONGODB || 'localhost:8000',
  {
    server: {
      socketOptions: {
        socketTimeoutMS: 10000,
        connectionTimeout: 10000
      }
    }
  }
);


let UserSchema = new mongoose.Schema({
  name: { type: String },
});

let PostSchema = new mongoose.Schema({
  title: { type: String },
  image: { type: String },
  user: { type: String }, // uuid
  likes: { type: Number },
  dislikes: { type: Number },
});

let User = mongoose.model('User', UserSchema);
let Post = mongoose.model('Post', PostSchema);




// let user = new User();
// user.name = 'channy';
// user.save();

express()
  .use(express.static(path.join(__dirname, 'public')))
  .use(bodyParser.json())
  .set('views', path.join(__dirname, 'views'))
  .set('view engine', 'ejs')
  .get('/', (req, res) => res.render('pages/index'))
  .get('/channy', async (req, res) => {
    let users = [];
    await User.find({}, function (err, _users) {
      users = _users;
      console.log(users);
    }).exec();

    return res.send(JSON.stringify({users: users}));
  })
  .get('/feed', async (req, res) => {
    let posts = [];
    await Post.find({}, function (err, _posts) {
      posts = _posts.map(u => u.toJSON());
    }).sort('-_id').exec();
    console.log(posts);
    return res.send(JSON.stringify({posts: posts}));
  })
  .get('/userFeed', async (req, res) => {
    let posts = [];
    let retries = 5;
    while(retries > 0) {
      await Post.find({user: req.param('user')}, function (err, _posts) {
        posts = _posts.map(u => u.toJSON());
      }).sort('-_id').exec();

      if (posts.length != 0) break;
      retries -= 1;
    }
    console.log(posts);
    return res.send(JSON.stringify({posts: posts}));
  })
  .post('/picture', async (req, res) => {
    invariant(req.body.user, 'user must exist');
    invariant(req.body.title, 'title must exist');
    invariant(req.body.image, 'image must exist');

    let post = new Post();
    post.user = req.body.user;
    post.title = req.body.title;
    post.image = req.body.image;
    post.save();

    console.log(JSON.stringify(post));
    return res.send(JSON.stringify({success: true, post: post.toJSON()}));
  })
  .post('/rate', async (req, res) => {
    invariant(req.body.user, 'user must exist');
    invariant(req.body.title, 'title must exist');
    invariant(req.body.image, 'image must exist');
    invariant(req.body.isLike, 'isLike must exist');

    console.log(req.body);
    let post = null;
    let retries = 5;
    while(retries > 0) {
      await Post.findOne({user: req.body.user, title: req.body.title, image: req.body.image},
        function (err, _post) {
          console.log(err)
          post = _post;
        }
      ).exec();
      if (post !== null) break;
      retries -= 1;
    }
    if (post === null) return res.send(JSON.stringify({success: false, post: null}));
    post.dislikes = post.dislikes || 0;
    post.likes = post.likes || 0;

    req.body.isLike === "true" ? post.likes += 1 : post.dislikes += 1;

    post.save();

    console.log(JSON.stringify(post));
    return res.send(JSON.stringify({success: true, post: post.toJSON()}));
  })
  .listen(PORT, () => console.log(`Listening on ${ PORT }`));
