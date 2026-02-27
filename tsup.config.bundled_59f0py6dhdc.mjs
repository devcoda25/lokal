// tsup.config.ts
import { defineConfig } from "tsup";
var commonOptions = {
  sourcemap: true,
  clean: true,
  dts: true,
  splitting: false,
  format: ["cjs", "esm"]
};
var tsup_config_default = defineConfig([
  // Core package - no external deps
  {
    ...commonOptions,
    entry: ["packages/core/src/index.ts"],
    outDir: "packages/core/dist",
    platform: "node",
    external: []
  },
  // CLI package - external for lokal-core
  {
    ...commonOptions,
    entry: ["packages/cli/src/index.ts"],
    outDir: "packages/cli/dist",
    platform: "node",
    external: ["lokal-core", "chalk", "commander", "ora"]
  },
  // React package - external for lokal-core
  {
    ...commonOptions,
    entry: ["packages/react/src/index.ts"],
    outDir: "packages/react/dist",
    platform: "browser",
    external: ["lokal-core", "react"]
  }
]);
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiZDpcXFxccGVyc29uYWwgcHJvamVjdHNcXFxcbW9kdWxlc1xcXFxMb2thbFxcXFx0c3VwLmNvbmZpZy50c1wiO2NvbnN0IF9faW5qZWN0ZWRfZGlybmFtZV9fID0gXCJkOlxcXFxwZXJzb25hbCBwcm9qZWN0c1xcXFxtb2R1bGVzXFxcXExva2FsXCI7Y29uc3QgX19pbmplY3RlZF9pbXBvcnRfbWV0YV91cmxfXyA9IFwiZmlsZTovLy9kOi9wZXJzb25hbCUyMHByb2plY3RzL21vZHVsZXMvTG9rYWwvdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIHR5cGUgT3B0aW9ucyB9IGZyb20gJ3RzdXAnO1xyXG5cclxuY29uc3QgY29tbW9uT3B0aW9uczogT3B0aW9ucyA9IHtcclxuICBzb3VyY2VtYXA6IHRydWUsXHJcbiAgY2xlYW46IHRydWUsXHJcbiAgZHRzOiB0cnVlLFxyXG4gIHNwbGl0dGluZzogZmFsc2UsXHJcbiAgZm9ybWF0OiBbJ2NqcycsICdlc20nXSxcclxufTtcclxuXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhbXHJcbiAgLy8gQ29yZSBwYWNrYWdlIC0gbm8gZXh0ZXJuYWwgZGVwc1xyXG4gIHtcclxuICAgIC4uLmNvbW1vbk9wdGlvbnMsXHJcbiAgICBlbnRyeTogWydwYWNrYWdlcy9jb3JlL3NyYy9pbmRleC50cyddLFxyXG4gICAgb3V0RGlyOiAncGFja2FnZXMvY29yZS9kaXN0JyxcclxuICAgIHBsYXRmb3JtOiAnbm9kZScsXHJcbiAgICBleHRlcm5hbDogW10sXHJcbiAgfSxcclxuICAvLyBDTEkgcGFja2FnZSAtIGV4dGVybmFsIGZvciBsb2thbC1jb3JlXHJcbiAge1xyXG4gICAgLi4uY29tbW9uT3B0aW9ucyxcclxuICAgIGVudHJ5OiBbJ3BhY2thZ2VzL2NsaS9zcmMvaW5kZXgudHMnXSxcclxuICAgIG91dERpcjogJ3BhY2thZ2VzL2NsaS9kaXN0JyxcclxuICAgIHBsYXRmb3JtOiAnbm9kZScsXHJcbiAgICBleHRlcm5hbDogWydsb2thbC1jb3JlJywgJ2NoYWxrJywgJ2NvbW1hbmRlcicsICdvcmEnXSxcclxuICB9LFxyXG4gIC8vIFJlYWN0IHBhY2thZ2UgLSBleHRlcm5hbCBmb3IgbG9rYWwtY29yZVxyXG4gIHtcclxuICAgIC4uLmNvbW1vbk9wdGlvbnMsXHJcbiAgICBlbnRyeTogWydwYWNrYWdlcy9yZWFjdC9zcmMvaW5kZXgudHMnXSxcclxuICAgIG91dERpcjogJ3BhY2thZ2VzL3JlYWN0L2Rpc3QnLFxyXG4gICAgcGxhdGZvcm06ICdicm93c2VyJyxcclxuICAgIGV4dGVybmFsOiBbJ2xva2FsLWNvcmUnLCAncmVhY3QnXSxcclxuICB9LFxyXG5dKTtcclxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4UCxTQUFTLG9CQUFrQztBQUV6UyxJQUFNLGdCQUF5QjtBQUFBLEVBQzdCLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFBQSxFQUNQLEtBQUs7QUFBQSxFQUNMLFdBQVc7QUFBQSxFQUNYLFFBQVEsQ0FBQyxPQUFPLEtBQUs7QUFDdkI7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQTtBQUFBLEVBRTFCO0FBQUEsSUFDRSxHQUFHO0FBQUEsSUFDSCxPQUFPLENBQUMsNEJBQTRCO0FBQUEsSUFDcEMsUUFBUTtBQUFBLElBQ1IsVUFBVTtBQUFBLElBQ1YsVUFBVSxDQUFDO0FBQUEsRUFDYjtBQUFBO0FBQUEsRUFFQTtBQUFBLElBQ0UsR0FBRztBQUFBLElBQ0gsT0FBTyxDQUFDLDJCQUEyQjtBQUFBLElBQ25DLFFBQVE7QUFBQSxJQUNSLFVBQVU7QUFBQSxJQUNWLFVBQVUsQ0FBQyxjQUFjLFNBQVMsYUFBYSxLQUFLO0FBQUEsRUFDdEQ7QUFBQTtBQUFBLEVBRUE7QUFBQSxJQUNFLEdBQUc7QUFBQSxJQUNILE9BQU8sQ0FBQyw2QkFBNkI7QUFBQSxJQUNyQyxRQUFRO0FBQUEsSUFDUixVQUFVO0FBQUEsSUFDVixVQUFVLENBQUMsY0FBYyxPQUFPO0FBQUEsRUFDbEM7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
