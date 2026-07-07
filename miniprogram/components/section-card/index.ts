Component({
  options: { multipleSlots: true },
  properties: {
    title: { type: String, value: "" },
    subtitle: { type: String, value: "" },
    collapsible: { type: Boolean, value: false }
  },
  data: {
    collapsed: false
  },
  methods: {
    toggleCollapse() {
      if (this.properties.collapsible) {
        this.setData({
          collapsed: !this.data.collapsed
        });
      }
    }
  }
});
