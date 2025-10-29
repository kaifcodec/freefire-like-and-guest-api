/*
Protective Source License v1.0 (PSL-1.0)
Copyright (c) 2025 Kaif
Unauthorized removal of credits or use for abusive/illegal purposes
will terminate all rights granted under this license.
*/


console.log("[*] Waiting for PlatformRegisterReq constructor...");

const ASSEMBLY = "Assembly-CSharp";
const CLASS_NAME = "proto.PlatformRegisterReq";
const POLL_MS = 200;
const wait = ms => new Promise(res => setTimeout(res, ms));

const poll = setInterval(() => {
    try {
        const asm = Il2Cpp.domain.assembly(ASSEMBLY);
        if (!asm) return;
        const klass = asm.image.tryClass(CLASS_NAME) || asm.image.tryClass("PlatformRegisterReq");
        if (!klass) return;

        clearInterval(poll);
        console.log("[+] Found", klass.name, "in", asm.name);
        attachCtorHook(klass);
    } catch (e) {
        // ignore
    }
}, POLL_MS);

function attachCtorHook(klass) {
    const ctor = klass.method(".ctor");
    if (!ctor) {
        console.error("[-] Constructor not found");
        return;
    }

    Interceptor.attach(ptr(ctor.virtualAddress), {
        onEnter() {
            console.log("[*] PlatformRegisterReq ctor called - registration starting");
        },
        onLeave: async function () {
            console.log("[*] Registration completed, waiting 0.85 seconds then resetting...");
            
            // Wait for registration to fully complete
            await wait(850);
            
            // Now force app restart after successful registration
            Java.perform(() => {
                try {
                    // Method 1: Kill app process and restart (most reliable)
                    const ActivityThread = Java.use("android.app.ActivityThread");
                    const context = ActivityThread.currentApplication().getApplicationContext();
                    
                    Java.scheduleOnMainThread(() => {
                        try {
                            // Get current process ID
                            const Process = Java.use("android.os.Process");
                            const pid = Process.myPid();
                            
                            console.log("[+] Restarting app after successful registration...");
                            
                            // Start the app again first
                            const Intent = Java.use("android.content.Intent");
                            const pm = context.getPackageManager();
                            const launchIntent = pm.getLaunchIntentForPackage(context.getPackageName());
                            
                            if (launchIntent) {
                                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK.value);
                                context.startActivity(launchIntent);
                                
                                // Then kill current process after short delay
                                setTimeout(() => {
                                    Process.killProcess(pid);
                                }, 1000);
                                
                                console.log("[+] App restart initiated - new guest account created!");
                            }
                            
                        } catch (err) {
                            console.error("[!] Process restart failed:", err);
                            
                            // Fallback: System.exit (less elegant but works)
                            try {
                                const System = Java.use("java.lang.System");
                                System.exit(0);
                            } catch (exitErr) {
                                console.error("[!] System.exit failed:", exitErr);
                            }
                        }
                    });
                    
                } catch (err) {
                    console.error("[!] App restart failed:", err);
                }
            });
        }
    });

    console.log("[+] Hook ready - will let registration complete then restart app");
}
