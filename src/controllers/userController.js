import User from "../models/User";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

export const getJoin = (req, res) => res.render("join", { pageTitle: "Join" });

export const postJoin = async (req, res) => {
  const { name, username, email, password, password2, location } = req.body;
  const pageTitle = "Join";
  if (password !== password2) {
    return res.status(400).render("join", { pageTitle, errorMessage: "Password confirmation does not match." });
  }
  const exists = await User.exists({ $or: [{ username }, { email }] });
  if (exists) {
    return res.status(400).render("join", { pageTitle, errorMessage: "This username/email is already taken." });
  }
  try {
    await User.create({
      name,
      username,
      email,
      password,
      location,
    });
    res.redirect("/login");
  } catch (error) {
    return res.status(400).render("join", { pageTitle, errorMessage: error._message });
  }
};

export const getLogin = (req, res) => res.render("login", { pageTitle: "Login" });

export const postLogin = async (req, res) => {
  const { username, password } = req.body;
  const pageTitle = "Login";
  const user = await User.findOne({ username, socialOnly: false });
  if (!user) {
    return res.status(400).render("login", { pageTitle, errorMessage: "An account with this username does not exists." });
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(400).render("login", { pageTitle, errorMessage: "Wrong password." });
  }
  req.session.loggedIn = true;
  req.session.user = user;
  return res.redirect("/");
};

export const startGithubLogin = (req, res) => {
  const baseUrl = "https://github.com/login/oauth/authorize";
  const config = {
    client_id: process.env.GH_CLIENT,
    allow_signup: false,
    scope: "read:user user:email",
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};

export const finishGithubLogin = async (req, res) => {
  const baseUrl = "https://github.com/login/oauth/access_token";
  const config = {
    client_id: process.env.GH_CLIENT,
    client_secret: process.env.GH_SECRET,
    code: req.query.code,
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
  ).json();
  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    const apiUrl = "https://api.github.com";
    const userData = await (
      await fetch(`${apiUrl}/user`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailData = await (
      await fetch(`${apiUrl}/user/emails`, {
        headers: {
          Authorization: `token ${access_token}`,
        },
      })
    ).json();
    const emailObj = emailData.find((email) => email.primary === true && email.verified === true);
    if (!emailObj) {
      res.redirect("/login");
    }
    let user = await User.findOne({ email: emailObj.email });
    if (!user) {
      user = await User.create({
        avatarUrl: userData.avatar_url,
        name: userData.name ? userData.name : "unknown",
        username: userData.login,
        email: emailObj.email,
        password: "",
        socialOnly: true,
        location: userData.location,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
  } else {
    res.redirect("/login");
  }
};

export const startKakaoLogin = (req, res) => {
  const baseUrl = "https://kauth.kakao.com/oauth/authorize";
  const config = {
    client_id: process.env.KAKAO_CLIENT,
    redirect_uri: process.env.KAKAO_REDIRECT_URL,
    response_type: "code",
  };
  const params = new URLSearchParams(config).toString();
  const finalUrl = `${baseUrl}?${params}`;
  return res.redirect(finalUrl);
};

export const finishKakaoLogin = async (req, res) => {
  if (req.query.error) {
    return res.send(req.query.error_description);
  }
  let baseUrl = "https://kauth.kakao.com";
  const tokenUrl = "/oauth/token";
  const config = {
    grant_type: "authorization_code",
    client_id: process.env.KAKAO_CLIENT,
    redirect_uri: process.env.KAKAO_REDIRECT_URL,
    code: req.query.code,
    client_secret: process.env.KAKAO_SECRET,
  };
  const params = new URLSearchParams(config).toString();
  let finalUrl = `${baseUrl}${tokenUrl}?${params}`;
  const tokenRequest = await (
    await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    })
  ).json();
  if ("access_token" in tokenRequest) {
    const { access_token } = tokenRequest;
    baseUrl = "https://kapi.kakao.com";
    const userData = await (
      await fetch(`${baseUrl}/v2/user/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      })
    ).json();
    if (!userData.kakao_account) {
      return res.redirect("/login");
    }
    const email =
      userData.kakao_account.is_email_valid === true && userData.kakao_account.is_email_verified === true ? userData.kakao_account.email : undefined;
    if (!email) {
      res.redirect("/login");
    }
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        avatarUrl: userData.kakao_account.profile.profile_image_url,
        name: userData.kakao_account.profile.nickname,
        username: userData.id,
        email: email,
        password: "",
        socialOnly: true,
        location: userData.location,
      });
    }
    req.session.loggedIn = true;
    req.session.user = user;
    return res.redirect("/");
  } else {
    res.redirect("/login");
  }
  return res.end();
};

export const logout = (req, res) => {
  req.session.loggedIn = false;
  req.flash("info", "Bye Bye");
  return res.redirect("/");
};

export const getEdit = (req, res) => {
  return res.render("users/edit-profile", { pageTitle: "Edit Profile" });
};

export const postEdit = async (req, res) => {
  const {
    session: {
      user: { _id, avatarUrl, email: savedEmail, username: savedUsername },
    },
    body: { name, email, username, location },
    file,
  } = req;
  let params = [];
  if (savedEmail != email) {
    params.push({ email });
  }
  if (savedUsername != username) {
    params.push({ username });
  }
  if (params?.length) {
    const foundUser = await User.findOne({ $or: params });
    if (_id != foundUser._id.toString()) {
      return res.status(400).render("users/edit-profile", { pageTitle: "Edit Profile", errorMessage: "This username/email is already taken." });
    }
  }
  const updatedUser = await User.findByIdAndUpdate(
    _id,
    {
      avatarUrl: file ? file.path : avatarUrl,
      name,
      email,
      username,
      location,
    },
    { new: true }
  );
  req.session.user = updatedUser;
  return res.redirect("/users/edit");
};

export const getChangePassword = (req, res) => {
  if (req.session.user.socialOnly === true) {
    req.flash("error", "Can't change password.");
    return res.redirect("/");
  }
  return res.render("users/change-password", { pageTitle: "Change Password" });
};

export const postChangePassword = async (req, res) => {
  const {
    session: {
      user: { _id },
    },
    body: { oldPassword, newPassword, newPasswordConfirmation },
  } = req;
  const user = await User.findById(_id);
  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) {
    return res.status(400).render("users/change-password", { pageTitle: "Change Password", errorMessage: "The current password is incorrect." });
  }
  if (oldPassword === newPassword) {
    return res
      .status(400)
      .render("users/change-password", { pageTitle: "Change Password", errorMessage: "The current password equals new password." });
  }
  if (newPassword !== newPasswordConfirmation) {
    return res
      .status(400)
      .render("users/change-password", { pageTitle: "Change Password", errorMessage: "The password does not match the confirmation." });
  }
  user.password = newPassword;
  await user.save();
  req.flash("info", "Password updated");
  req.session.destroy();
  return res.redirect("/login");
};

export const see = async (req, res) => {
  const { id } = req.params;
  if (id === "null") {
    return res.redirect("/");
  }
  const user = await User.findById(id).populate({
    path: "videos",
    populate: {
      path: "owner",
      model: "User",
    },
  });
  if (!user) {
    return res.status(404).render("404", { pageTitle: "User not found." });
  }
  res.render("users/profile", { pageTitle: user.name, user });
};
