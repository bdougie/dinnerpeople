import '../auth/auth_util.dart';
import '../complete_profile/complete_profile_widget.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import '../flutter_flow/flutter_flow_util.dart';
import '../flutter_flow/flutter_flow_widgets.dart';
import '../login/login_widget.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class RegisterWidget extends StatefulWidget {
  RegisterWidget({Key key}) : super(key: key);

  @override
  _RegisterWidgetState createState() => _RegisterWidgetState();
}

class _RegisterWidgetState extends State<RegisterWidget> {
  TextEditingController confirmPasswordController;
  bool confirmPasswordVisibility;
  TextEditingController emailAddressController;
  TextEditingController passwordController;
  bool passwordVisibility;
  final scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    confirmPasswordController = TextEditingController();
    confirmPasswordVisibility = false;
    emailAddressController = TextEditingController();
    passwordController = TextEditingController();
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
              fit: BoxFit.cover,
              image: Image.asset(
                'assets/images/launchScreen@3x.png',
              ).image,
            ),
          ),
          child: Padding(
            padding: EdgeInsets.fromLTRB(0, 0, 0, 110),
            child: Column(
              mainAxisSize: MainAxisSize.max,
              mainAxisAlignment: MainAxisAlignment.center,
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
                  padding: EdgeInsets.fromLTRB(40, 0, 40, 12),
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
                        controller: emailAddressController,
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
                        controller: passwordController,
                        obscureText: !passwordVisibility,
                        decoration: InputDecoration(
                          labelText: 'Choose Password',
                          labelStyle: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                          ),
                          hintText: 'Choose Password',
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
                        controller: confirmPasswordController,
                        obscureText: !confirmPasswordVisibility,
                        decoration: InputDecoration(
                          labelText: 'Confirm Password',
                          labelStyle: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                          ),
                          hintText: 'Confirm Password',
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
                              () => confirmPasswordVisibility =
                                  !confirmPasswordVisibility,
                            ),
                            child: Icon(
                              confirmPasswordVisibility
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
                    if (passwordController.text !=
                        confirmPasswordController.text) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            "Passwords don't match!",
                          ),
                        ),
                      );
                      return;
                    }

                    final user = await createAccountWithEmail(
                      context,
                      emailAddressController.text,
                      passwordController.text,
                    );
                    if (user == null) {
                      return;
                    }

                    await Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CompleteProfileWidget(),
                      ),
                      (r) => false,
                    );
                  },
                  text: 'Create Account',
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
                          'Already have an account?',
                          style: FlutterFlowTheme.bodyText1.override(
                            fontFamily: 'Lexend Deca',
                          ),
                        ),
                      ),
                      FFButtonWidget(
                        onPressed: () async {
                          await Navigator.pushAndRemoveUntil(
                            context,
                            PageTransition(
                              type: PageTransitionType.fade,
                              duration: Duration(milliseconds: 150),
                              reverseDuration: Duration(milliseconds: 150),
                              child: LoginWidget(),
                            ),
                            (r) => false,
                          );
                        },
                        text: 'Login',
                        options: FFButtonOptions(
                          width: 100,
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
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
