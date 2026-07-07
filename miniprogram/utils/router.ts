export function redirectByRole(user: AnyRecord, replace = false) {
  const role = user?.roleCode;
  let url = "/pages/login/index";

  if (role === "butler") {
    url = "/pages/butler/home/index";
  } else if (role === "dispatcher") {
    url = "/pages/dispatcher/home/index";
  } else {
    wx.showModal({
      title: "请使用后台系统",
      content: "当前账号角色暂不支持小程序端使用。",
      showCancel: false
    });
    url = "/pages/login/index";
  }

  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  const currentRoute = currentPage ? "/" + currentPage.route : "";

  if (url === "/pages/login/index" && (currentRoute === "/pages/login/index" || currentRoute === "pages/login/index")) {
    return;
  }

  if (replace) {
    wx.reLaunch({ url });
  } else {
    wx.navigateTo({ url });
  }
}

export function navTo(url: string) {
  wx.navigateTo({ url });
}

export function reLaunch(url: string) {
  wx.reLaunch({ url });
}

