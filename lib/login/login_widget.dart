import '../auth/auth_util.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../flutter_flow/flutter_flow_widgets.dart';
import '../forgot_password/forgot_password_widget.dart';
import '../main.dart';
import '../my_friends/my_friends_widget.dart';
import '../register/register_widget.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class LoginWidget extends StatefulWidget {
  LoginWidget({Key key}) : super(key: key);

  @override
  _LoginWidgetState createState() => _LoginWidgetState();
}

class _LoginWidgetState extends State<LoginWidget> {
  TextEditingController emailTextController;
  TextEditingController passwordTextController;
  bool passwordVisibility;
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    emailTextController = TextEditingController();
    passwordTextController = TextEditingController();
    passwordVisibility = false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: scaffoldKey,
      backgroundColor: FlutterFlowTheme.dark900,
      body: Align(
        alignment: Alignment(-0.14, -0.08),
        child: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            color: Color(0x19444D59),
            image: DecorationImage(
              fit: BoxFit.fitWidth,
              image: Image.asset(
                'assets/images/launchScreen@3x.png',
              ).image,
            ),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(0, 0, 0, 110),
            child: Column(
              mainAxisSize: MainAxisSize.max,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Padding(
                  padding: EdgeInsets.fromLTRB(0, 20, 0, 24),
                  child: Image.asset(
                    'assets/images/logoGeekMessaging.png',
                    width: 160,
                    height: 140,
                    fit: BoxFit.cover,
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(40, 0, 40, 20),
                  child: Container(
                    width: double.infinity,
                    height: 50,
                    decoration: BoxDecoration(
                      color: FlutterFlowTheme.background,
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(12, 0, 20, 0),
                      child: TextFormField(
                        controller: emailTextController,
                        obscureText: false,
                        decoration: InputDecoration(
                          labelText: 'Email Address',
                          labelStyle: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                          ),
                          hintText: 'Email Address',
                          hintStyle: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                            color: FlutterFlowTheme.tertiaryColor,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: Color(0x00000000),
                              width: 1,
                            ),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(4.0),
                              topRight: Radius.circular(4.0),
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: Color(0x00000000),
                              width: 1,
                            ),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(4.0),
                              topRight: Radius.circular(4.0),
                            ),
                          ),
                        ),
                        style: FlutterFlowTheme.bodyText1.override(
                          fontFamily: 'Lexend Deca',
                          color: FlutterFlowTheme.tertiaryColor,
                        ),
                        keyboardType: TextInputType.emailAddress,
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(40, 0, 40, 20),
                  child: Container(
                    width: double.infinity,
                    height: 50,
                    decoration: BoxDecoration(
                      color: FlutterFlowTheme.background,
                      borderRadius: BorderRadius.circular(25),
                    ),
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(12, 0, 20, 0),
                      child: TextFormField(
                        controller: passwordTextController,
                        obscureText: !passwordVisibility,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          labelStyle: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                          ),
                          hintText: 'Password',
                          hintStyle: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                            color: FlutterFlowTheme.tertiaryColor,
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: Color(0x00000000),
                              width: 1,
                            ),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(4.0),
                              topRight: Radius.circular(4.0),
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderSide: BorderSide(
                              color: Color(0x00000000),
                              width: 1,
                            ),
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(4.0),
                              topRight: Radius.circular(4.0),
                            ),
                          ),
                          suffixIcon: InkWell(
                            onTap: () => setState(
                              () => passwordVisibility = !passwordVisibility,
                            ),
                            child: Icon(
                              passwordVisibility
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                              color: FlutterFlowTheme.grayDark,
                              size: 24,
                            ),
                          ),
                        ),
                        style: FlutterFlowTheme.bodyText1.override(
                          fontFamily: 'Lexend Deca',
                          color: FlutterFlowTheme.tertiaryColor,
                        ),
                      ),
                    ),
                  ),
                ),
                FFButtonWidget(
                  onPressed: () async {
                    final user = await signInWithEmail(
                      context,
                      emailTextController.text,
                      passwordTextController.text,
                    );
                    if (user == null) {
                      return;
                    }

                    await Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) =>
                            NavBarPage(initialPage: 'chatMain'),
                      ),
                    );
                  },
                  text: 'Log In',
                  options: FFButtonOptions(
                    width: 300,
                    height: 55,
                    color: FlutterFlowTheme.primaryColor,
                    textStyle: FlutterFlowTheme.subtitle2.override(
                      fontFamily: 'Lexend Deca',
                    ),
                    elevation: 4,
                    borderSide: BorderSide(
                      color: Colors.transparent,
                      width: 2,
                    ),
                    borderRadius: 30,
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(0, 24, 0, 0),
                  child: Row(
                    mainAxisSize: MainAxisSize.max,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Padding(
                        padding: EdgeInsets.fromLTRB(0, 0, 12, 0),
                        child: Text(
                          'Don\'t have an account?',
                          style: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                          ),
                        ),
                      ),
                      FFButtonWidget(
                        onPressed: () async {
                          await Navigator.push(
                            context,
                            PageTransition(
                              type: PageTransitionType.fade,
                              duration: Duration(milliseconds: 150),
                              reverseDuration: Duration(milliseconds: 150),
                              child: RegisterWidget(),
                            ),
                          );
                        },
                        text: 'Create Account',
                        options: FFButtonOptions(
                          width: 140,
                          height: 40,
                          color: Color(0x004B39EF),
                          textStyle: FlutterFlowTheme.subtitle2.override(
                            fontFamily: 'Lexend Deca',
                            color: Colors.white,
                          ),
                          elevation: 0,
                          borderSide: BorderSide(
                            color: Colors.transparent,
                            width: 0,
                          ),
                          borderRadius: 12,
                        ),
                      )
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(0, 24, 0, 0),
                  child: FFButtonWidget(
                    onPressed: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => ForgotPasswordWidget(),
                        ),
                      );
                    },
                    text: 'Forgot Password?',
                    options: FFButtonOptions(
                      width: 200,
                      height: 55,
                      color: FlutterFlowTheme.dark900,
                      textStyle: FlutterFlowTheme.bodyText1.override(
                        fontFamily: 'Lexend Deca',
                        color: FlutterFlowTheme.tertiaryColor,
                      ),
                      elevation: 0,
                      borderSide: BorderSide(
                        color: Colors.transparent,
                        width: 2,
                      ),
                      borderRadius: 30,
                    ),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.fromLTRB(0, 24, 0, 0),
                  child: FFButtonWidget(
                    onPressed: () async {
                      final user = await signInAnonymously(context);
                      if (user == null) {
                        return;
                      }
                      await Navigator.push(
                        context,
                        PageTransition(
                          type: PageTransitionType.bottomToTop,
                          duration: Duration(milliseconds: 250),
                          reverseDuration: Duration(milliseconds: 250),
                          child: MyFriendsWidget(),
                        ),
                      );
                    },
                    text: 'Continue as Guest',
                    options: FFButtonOptions(
                      width: 200,
                      height: 55,
                      color: FlutterFlowTheme.background,
                      textStyle: FlutterFlowTheme.subtitle2.override(
                        fontFamily: 'Lexend Deca',
                      ),
                      elevation: 4,
                      borderSide: BorderSide(
                        color: Colors.transparent,
                        width: 2,
                      ),
                      borderRadius: 30,
                    ),
                  ),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
