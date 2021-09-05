import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'auth/firebase_user_provider.dart';
import '../flutter_flow/flutter_flow_theme.dart';
import 'package:dinnerpeople/login/login_widget.dart';
import 'flutter_flow/flutter_flow_theme.dart';
import 'chat_main/chat_main_widget.dart';
import 'my_profile/my_profile_widget.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}

class MyApp extends StatefulWidget {
  // This widget is the root of your application.
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  Stream<DinnerpeopleFirebaseUser> userStream;
  DinnerpeopleFirebaseUser initialUser;

  @override
  void initState() {
    super.initState();
    userStream = dinnerpeopleFirebaseUserStream()
      ..listen((user) => initialUser ?? setState(() => initialUser = user));
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'dinnerpeople',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: initialUser == null
          ? Center(
              child: Builder(
                builder: (context) => Image.asset(
                  'assets/images/splash@2x.png',
                  width: MediaQuery.of(context).size.width / 2,
                  fit: BoxFit.fitWidth,
                ),
              ),
            )
          : currentUser.loggedIn
              ? NavBarPage()
              : LoginWidget(),
    );
  }
}

class NavBarPage extends StatefulWidget {
  NavBarPage({Key key, this.initialPage}) : super(key: key);

  final String initialPage;

  @override
  _NavBarPageState createState() => _NavBarPageState();
}

/// This is the private State class that goes with NavBarPage.
class _NavBarPageState extends State<NavBarPage> {
  String _currentPage = 'chatMain';

  @override
  void initState() {
    super.initState();
    _currentPage = widget.initialPage ?? _currentPage;
  }

  @override
  Widget build(BuildContext context) {
    final tabs = {
      'chatMain': ChatMainWidget(),
      'myProfile': MyProfileWidget(),
    };
    return Scaffold(
      body: tabs[_currentPage],
      bottomNavigationBar: BottomNavigationBar(
        items: const <BottomNavigationBarItem>[
          BottomNavigationBarItem(
            icon: Icon(
              Icons.chat_bubble_outline,
              size: 24,
            ),
            activeIcon: Icon(
              Icons.chat_bubble_rounded,
              size: 24,
            ),
            label: '',
          ),
          BottomNavigationBarItem(
            icon: Icon(
              Icons.account_circle_outlined,
              size: 24,
            ),
            activeIcon: Icon(
              Icons.account_circle_rounded,
              size: 24,
            ),
            label: '',
          )
        ],
        backgroundColor: FlutterFlowTheme.dark900,
        currentIndex: tabs.keys.toList().indexOf(_currentPage),
        selectedItemColor: Color(0xFF4B39EF),
        unselectedItemColor: Color(0x98939393),
        onTap: (i) => setState(() => _currentPage = tabs.keys.toList()[i]),
        showSelectedLabels: true,
        showUnselectedLabels: true,
        // Temporary fix for https://github.com/flutter/flutter/issues/84556
        selectedLabelStyle: const TextStyle(fontSize: 0.001),
        unselectedLabelStyle: const TextStyle(fontSize: 0.001),
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}
