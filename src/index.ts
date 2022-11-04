import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import path from "path";

const fetch = require("isomorphic-fetch");

import session from "express-session";
const MemoryStore = require("memorystore")(session);

const prisma = new PrismaClient();
const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    cookie: { maxAge: 86400000 },
    store: new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: true,
    secret: "keyboard cat",
  })
);

// Home
app.get("/", async (req, res) => {
  res.render("home", {
    linkActive: "home",
    user: req.session?.user,
  });
});

// Login
app.get("/login", async (req, res) => {
  if (req.query.redirect_to) {
    req.session!.redirect_to = req.query.redirect_to;
    req.session?.save(() => {});
  }
  res.render("login", {
    linkActive: "login",
    err: undefined,
    user: req.session?.user,
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  
  if(req.body.safe != undefined){
    //---------safe---------
    const user = await prisma.userSafe.findFirst({ where: { username } });

  const response_key = req.body["g-recaptcha-response"];
  const secret_key = "6LdVjN0iAAAAABte3AAU9KdpILaa3fPklJcFKTz9";

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${secret_key}&response=${response_key}`;

  fetch(url, {
    method: "post",
  })
    .then((response: { json: () => any; }) => response.json())
    .then((google_response: { success: boolean; }) => {
      if (google_response.success == true) {
        // success
        if (!user || user.password !== hash(password)) {
          res.render("login", {
            linkActive: "login",
            err: "Username or password is incorrect.",
            user: req.session?.user,
          });
          return;
        }
      
        const redirect_to = req.session?.redirect_to || "/";
      
        req.session!.user = user;
        req.session!.redirect_to = undefined;
        req.session?.save(() => {});

        return res.redirect(redirect_to);
      } else {
        // fail
        res.render("login", {
          linkActive: "login",
          err: "Recaptcha fail",
          user: req.session?.user,
        });
        return;
      }
    })
    .catch((error: any) => {
        // fail
        res.render("login", {
          linkActive: "login",
          err: "Recaptcha fail",
          user: req.session?.user,
        });
        return;
    });
  } else {
    //--------unsafe--------
    const { username, password } = req.body;

    const user = await prisma.user.findFirst({ where: { username } });
  
    if (!user) {
      res.render("login", {
        linkActive: "login",
        err: "User with that username does not exist",
        user: req.session?.user,
      });
      return;
    }

    if (user!.password !== password) {
      res.render("login", {
        linkActive: "login",
        err: "Wrong password for that username",
        user: req.session?.user,
      });
      return;
    }
  
    const redirect_to = req.session?.redirect_to || "/";
  
    req.session!.user = user;
    req.session!.redirect_to = undefined;
    req.session?.save(() => {});
    res.redirect(redirect_to);
  }
});

// Logout
app.get("/logout", async (req, res) => {
  req.session!.user = undefined;
  req.session?.save(() => {});
  res.redirect("/");
});

// SQL
app.get("/sql", async (req, res) => {
  const users = await prisma.user.findMany();

  res.render("sql", {
    linkActive: "sql",
    user: req.session?.user,
    users: users,
    result: undefined,
    query: undefined,
    preventSqlInjection: undefined,
  });
});

app.post("/sql", async (req, res) => {
  const { query, preventSqlInjection } = req.body;
  let result;

  if (preventSqlInjection) {
    result = await prisma.user.findMany({
      take: 10,
      select: { id: true, username: true, role: true },
      where: { username: { contains: query } },
    });
  } else {
    result = await prisma.$queryRawUnsafe(
      `SELECT id, username, role FROM User WHERE username LIKE '%${query}%' LIMIT 10`
    );
  }

  const users = await prisma.user.findMany();

  res.render("sql", {
    linkActive: "sql",
    user: req.session?.user,
    users: users,
    result: result,
    query,
    preventSqlInjection,
  });
});

const server = app.listen(process.env.PORT || 3000, () =>
  console.log(`* Server ready at: http://localhost:${process.env.PORT || 3000}`)
);

function hash(str: String) {
  var hash = 0,
    i, chr;
  if (str.length === 0) return hash;
  for (i = 0; i < str.length; i++) {
    chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

