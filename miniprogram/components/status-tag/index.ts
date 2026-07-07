import { getStatus } from "../../utils/status-map";

Component({
  properties: {
    type: { type: String, value: "order" },
    value: { type: String, value: "" },
    text: { type: String, value: "" }
  },
  data: {
    label: "",
    tone: "gray"
  },
  observers: {
    "type,value,text": function updateTag(type: string, value: string, text: string) {
      const status = getStatus(type, value);
      this.setData({
        label: text || status.text,
        tone: status.tone || "gray"
      });
    }
  }
});

