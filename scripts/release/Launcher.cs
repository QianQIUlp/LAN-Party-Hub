// Modified for LAN Party Hub; see CHANGES.md and NOTICE.md.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

internal static class Launcher
{
    private const int FirstPort = 3000;
    private const int LastPort = 3010;

    [STAThread]
    private static int Main()
    {
        bool createdNew;
        using (var mutex = new Mutex(true, @"Local\LANPartyHubLauncher", out createdNew))
        {
            if (!createdNew)
            {
                int runningPort = FindRunningPort();
                if (runningPort > 0)
                {
                    OpenBrowser(runningPort);
                    return 0;
                }

                MessageBox.Show(
                    "LAN Party Hub 已经在运行，但暂时无法打开主屏。请稍后重试。",
                    "LAN Party Hub",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
                return 0;
            }

            return RunApplication();
        }
    }

    private static int RunApplication()
    {
        string root = AppDomain.CurrentDomain.BaseDirectory;
        string nodePath = Path.Combine(root, "runtime", "node.exe");
        string appRoot = Path.Combine(root, "app");
        string serverPath = Path.Combine(appRoot, "server", "main.js");
        string dataRoot = Path.Combine(root, "data");
        string logPath = Path.Combine(dataRoot, "lan-party-hub.log");
        string snapshotPath = Path.Combine(dataRoot, "room-snapshots.json");

        Directory.CreateDirectory(dataRoot);

        if (!File.Exists(nodePath) || !File.Exists(serverPath))
        {
            MessageBox.Show(
                "便携包不完整。请先完整解压 ZIP，再启动 LAN Party Hub。",
                "LAN Party Hub",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }

        int port = FindFreePort();
        if (port <= 0)
        {
            MessageBox.Show(
                "端口 3000–3010 均被占用。请关闭占用这些端口的程序后重试。",
                "LAN Party Hub",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return 1;
        }

        string controlToken = Guid.NewGuid().ToString("N");
        var startInfo = new ProcessStartInfo(nodePath, "\"" + serverPath + "\"")
        {
            WorkingDirectory = appRoot,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true
        };
        startInfo.EnvironmentVariables["NODE_ENV"] = "production";
        startInfo.EnvironmentVariables["PORT"] = port.ToString();
        startInfo.EnvironmentVariables["OPEN_PARTY_LAB_WEB_ROOT"] = Path.Combine(appRoot, "web");
        startInfo.EnvironmentVariables["JSON_SNAPSHOT_PATH"] = snapshotPath;
        startInfo.EnvironmentVariables["LAN_PARTY_HUB_CONTROL_TOKEN"] = controlToken;

        using (var log = new StreamWriter(logPath, true))
        using (var server = new Process { StartInfo = startInfo, EnableRaisingEvents = true })
        {
            server.OutputDataReceived += delegate(object sender, DataReceivedEventArgs args)
            {
                if (args.Data != null) { log.WriteLine(args.Data); log.Flush(); }
            };
            server.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs args)
            {
                if (args.Data != null) { log.WriteLine(args.Data); log.Flush(); }
            };

            try
            {
                server.Start();
                server.BeginOutputReadLine();
                server.BeginErrorReadLine();
            }
            catch (Exception error)
            {
                MessageBox.Show(error.Message, "LAN Party Hub", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }

            if (!WaitUntilReady(server, port))
            {
                MessageBox.Show(
                    "LAN Party Hub 启动失败。请查看 data\\lan-party-hub.log。",
                    "LAN Party Hub",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                if (!server.HasExited) server.Kill();
                return 1;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            var context = new ApplicationContext();
            var tray = new NotifyIcon();
            bool exitRequested = false;

            Action openHost = delegate { OpenBrowser(port); };
            Action copyJoinUrl = delegate
            {
                string health = ReadHealth(port);
                string joinUrl = ExtractJoinUrl(health);
                if (!String.IsNullOrEmpty(joinUrl))
                {
                    Clipboard.SetText(joinUrl);
                    tray.ShowBalloonTip(2500, "LAN Party Hub", "手机加入地址已复制。", ToolTipIcon.Info);
                }
                else
                {
                    tray.ShowBalloonTip(2500, "LAN Party Hub", "暂时无法读取手机加入地址。", ToolTipIcon.Warning);
                }
            };
            Action openLog = delegate
            {
                Process.Start(new ProcessStartInfo("notepad.exe", "\"" + logPath + "\"") { UseShellExecute = true });
            };
            Action exit = delegate
            {
                if (exitRequested) return;
                exitRequested = true;
                RequestShutdown(port, controlToken);
                if (!server.HasExited && !server.WaitForExit(5000)) server.Kill();
                tray.Visible = false;
                context.ExitThread();
            };

            tray.Icon = SystemIcons.Application;
            tray.Text = "LAN Party Hub";
            tray.Visible = true;
            tray.ContextMenu = new ContextMenu(new[]
            {
                new MenuItem("打开主屏", delegate { openHost(); }),
                new MenuItem("复制手机加入地址", delegate { copyJoinUrl(); }),
                new MenuItem("查看日志", delegate { openLog(); }),
                new MenuItem("-"),
                new MenuItem("退出", delegate { exit(); })
            });
            tray.DoubleClick += delegate { openHost(); };
            server.Exited += delegate
            {
                if (!exitRequested)
                {
                    tray.Visible = false;
                    MessageBox.Show(
                        "LAN Party Hub 服务意外退出。请查看 data\\lan-party-hub.log。",
                        "LAN Party Hub",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error);
                    Application.Exit();
                }
            };

            openHost();
            tray.ShowBalloonTip(3000, "LAN Party Hub", "服务已启动。右键托盘图标可重新打开主屏或退出。", ToolTipIcon.Info);
            Application.Run(context);

            if (!exitRequested)
            {
                exit();
            }

            tray.Dispose();
            return server.HasExited ? server.ExitCode : 0;
        }
    }

    private static int FindFreePort()
    {
        for (int port = FirstPort; port <= LastPort; port++)
        {
            TcpListener listener = null;
            try
            {
                listener = new TcpListener(IPAddress.Loopback, port);
                listener.Start();
                return port;
            }
            catch (SocketException) { }
            finally
            {
                if (listener != null) listener.Stop();
            }
        }

        return -1;
    }

    private static int FindRunningPort()
    {
        for (int port = FirstPort; port <= LastPort; port++)
        {
            string health = ReadHealth(port);
            if (health != null && health.Contains("LAN Party Hub")) return port;
        }

        return -1;
    }

    private static bool WaitUntilReady(Process server, int port)
    {
        for (int attempt = 0; attempt < 100 && !server.HasExited; attempt++)
        {
            if (ReadHealth(port) != null) return true;
            Thread.Sleep(100);
        }

        return false;
    }

    private static string ReadHealth(int port)
    {
        try
        {
            var request = WebRequest.CreateHttp("http://127.0.0.1:" + port + "/health");
            request.Timeout = 350;
            using (var response = request.GetResponse())
            using (var reader = new StreamReader(response.GetResponseStream()))
            {
                return reader.ReadToEnd();
            }
        }
        catch { return null; }
    }

    private static string ExtractJoinUrl(string health)
    {
        if (String.IsNullOrEmpty(health)) return null;
        Match match = Regex.Match(health, "\\\"joinUrl\\\":\\\"([^\\\"]+)\\\"");
        return match.Success ? match.Groups[1].Value.Replace("\\/", "/") : null;
    }

    private static void RequestShutdown(int port, string token)
    {
        try
        {
            var request = WebRequest.CreateHttp("http://127.0.0.1:" + port + "/control/shutdown");
            request.Method = "POST";
            request.Timeout = 1000;
            request.Headers["x-lan-party-hub-token"] = token;
            request.ContentLength = 0;
            using (request.GetResponse()) { }
        }
        catch { }
    }

    private static void OpenBrowser(int port)
    {
        Process.Start(new ProcessStartInfo("http://127.0.0.1:" + port + "/") { UseShellExecute = true });
    }
}
