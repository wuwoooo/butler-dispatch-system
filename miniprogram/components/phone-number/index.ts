Component({
  properties: {
    phone: { type: String, value: "" },
    display: { type: String, value: "" }
  },
  data: {
    normalizedPhone: "",
    displayText: "-"
  },
  observers: {
    "phone, display"(phone: string, display: string) {
      const normalizedPhone = String(phone || "").trim();
      const displayText = String(display || normalizedPhone || "-").trim() || "-";
      this.setData({ normalizedPhone, displayText });
    }
  },
  methods: {
    makeCall() {
      if (!this.data.normalizedPhone) return;
      wx.makePhoneCall({
        phoneNumber: this.data.normalizedPhone,
        fail: (error: AnyRecord) => {
          const errMsg = String(error?.errMsg || "").toLowerCase();
          if (errMsg.includes("cancel")) return;
          wx.showToast({ title: "拨号失败，请稍后重试", icon: "none" });
        }
      });
    }
  }
});
