using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using System.Collections.Generic;

internal static class Launcher {
    static Process child;
    static string basePath, instance, address;
    static bool smoke;
    static readonly JavaScriptSerializer Json = new JavaScriptSerializer();

    static Dictionary<string, object> Config(int port) {
        try {
            var request = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/config");
            request.Timeout = 450; request.Proxy = null;
            using (var response = request.GetResponse()) using (var reader = new StreamReader(response.GetResponseStream())) {
                var config = Json.Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
                if (config.ContainsKey("appId") && (string)config["appId"] == "tasty" && config.ContainsKey("instanceId") && (string)config["instanceId"] == instance) return config;
            }
        } catch { }
        return null;
    }
    static void Open(string path) { Process.Start(new ProcessStartInfo(address + path) { UseShellExecute = true }); }
    static void StopChild() { try { if (child != null && !child.HasExited) { child.Kill(); child.WaitForExit(4000); } } catch { } }
    static string Quoted(string value) { return "\"" + value + "\""; }

    [STAThread]
    static int Main(string[] args) {
        smoke = Array.IndexOf(args, "--smoke-test") >= 0;
        bool noBrowser = Array.IndexOf(args, "--no-browser") >= 0;
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        basePath = AppDomain.CurrentDomain.BaseDirectory;
        string root = Path.Combine(basePath, "系统文件"), app = Path.Combine(root, "app"), data = Path.Combine(root, "data");
        using (var sha = SHA256.Create()) instance = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(root.ToLowerInvariant()))).Replace("-", "").ToLowerInvariant().Substring(0,16);
        bool ownsMutex;
        using (var mutex = new Mutex(true, "Local\\Tasty-" + instance, out ownsMutex)) {
            try {
                for (int port = 3000; port <= 3010; port++) {
                    var existing = Config(port);
                    if (existing != null) { address = "http://localhost:" + port; if (!smoke && !noBrowser) Open(""); return 0; }
                }
                if (!ownsMutex) throw new Exception("食遇正在启动，请稍候再打开。");
                string node = Path.Combine(root, "runtime", "node.exe"), server = Path.Combine(app, "server", "main.cjs");
                if (!File.Exists(node) || !File.Exists(server) || !File.Exists(Path.Combine(app, "dist", "index.html"))) throw new Exception("运行文件不完整。请先完整解压下载包，再打开食遇.exe。");
                Directory.CreateDirectory(Path.Combine(data, "logs"));
                int chosen = 0;
                for (int port = 3000; port <= 3010; port++) {
                    var listener = new TcpListener(IPAddress.Loopback, port);
                    try { listener.Start(); chosen = port; } catch { } finally { listener.Stop(); }
                    if (chosen != 0) break;
                }
                if (chosen == 0) throw new Exception("本机3000–3010端口均被占用，请关闭不用的本地服务后重试。");
                var info = new ProcessStartInfo(node, Quoted(server) + " --production") { WorkingDirectory=app, UseShellExecute=false, CreateNoWindow=true, RedirectStandardError=true, RedirectStandardOutput=true };
                info.EnvironmentVariables["PORT"] = chosen.ToString(); info.EnvironmentVariables["HOST"] = "127.0.0.1";
                info.EnvironmentVariables["TASTY_ROOT"] = root; info.EnvironmentVariables["TASTY_APP_DIR"] = app;
                info.EnvironmentVariables["TASTY_WORKSPACE"] = basePath; info.EnvironmentVariables["TASTY_INSTANCE"] = instance;
                info.EnvironmentVariables["DB_PATH"] = Path.Combine(data, "tasty.sqlite");
                info.EnvironmentVariables.Remove("MAP_PROVIDER"); info.EnvironmentVariables.Remove("AMAP_JS_KEY"); info.EnvironmentVariables.Remove("AMAP_SECURITY_CODE");
                child = new Process { StartInfo = info };
                object logLock = new object(); string log = Path.Combine(data, "logs", "desktop.log");
                DataReceivedEventHandler logger = (sender,e) => { if (e.Data != null) try { lock(logLock) { File.AppendAllText(log, e.Data + Environment.NewLine, Encoding.UTF8); } } catch { } };
                child.OutputDataReceived += logger; child.ErrorDataReceived += logger;
                child.Start(); child.BeginOutputReadLine(); child.BeginErrorReadLine();
                Dictionary<string, object> ready = null;
                for (int attempt=0; attempt<60; attempt++) {
                    ready = Config(chosen); if (ready != null) break;
                    if (child.HasExited) throw new Exception("服务未能启动。请查看系统文件/data/logs/desktop.log。");
                    Thread.Sleep(250);
                }
                if (ready == null) throw new Exception("启动超时，请稍后重试。日志在系统文件/data/logs/desktop.log。");
                address = "http://localhost:" + chosen;
                if (smoke) return 0;
                if (!noBrowser) Open(ready.ContainsKey("setupRequired") && (bool)ready["setupRequired"] ? "/settings?welcome=1" : "");
                var menu = new ContextMenuStrip();
                menu.Items.Add("打开美食地图", null, (sender,e) => Open(""));
                menu.Items.Add("地图设置", null, (sender,e) => Open("/settings"));
                menu.Items.Add(new ToolStripSeparator());
                menu.Items.Add("退出食遇", null, (sender,e) => Application.Exit());
                using (var tray = new NotifyIcon { Icon=Icon.ExtractAssociatedIcon(Application.ExecutablePath), Text="食遇 · 美食地图", ContextMenuStrip=menu, Visible=true }) {
                    tray.DoubleClick += (sender,e) => Open("");
                    using (var timer = new System.Windows.Forms.Timer { Interval=1500 }) {
                        timer.Tick += (sender,e) => { if (child.HasExited) { tray.Visible=false; MessageBox.Show("食遇服务已停止，可以重新打开。", "食遇", MessageBoxButtons.OK, MessageBoxIcon.Information); Application.Exit(); } };
                        timer.Start(); Application.Run();
                    }
                    tray.Visible=false;
                }
                return 0;
            } catch (Exception error) {
                if (!smoke) MessageBox.Show(error.Message, "食遇", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            } finally { StopChild(); if (ownsMutex) mutex.ReleaseMutex(); }
        }
    }
}
