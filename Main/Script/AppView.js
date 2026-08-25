
Carbon.PageView({
  Name:"HomeView",
  Initial:true,
  OnScript(){
    HomeView()
  },
 Backpress:()=>{
       AlertConfirm("Do You Want to exit App",async (e)=>{
            if(e){
             await Android.killApp();
            }else{
              console.log("App not exit")
            }
       })
  }
})
