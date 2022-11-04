import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import path from "path";

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

  const user = await prisma.user.findFirst({ where: { username } });

  if (!user || user.password !== password) {
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
  res.redirect(redirect_to);
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
