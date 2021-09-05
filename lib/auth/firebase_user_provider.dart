import 'package:firebase_auth/firebase_auth.dart';
import 'package:rxdart/rxdart.dart';

class DinnerpeopleFirebaseUser {
  DinnerpeopleFirebaseUser(this.user);
  final User user;
  bool get loggedIn => user != null;
}

DinnerpeopleFirebaseUser currentUser;
bool get loggedIn => currentUser?.loggedIn ?? false;
Stream<DinnerpeopleFirebaseUser> dinnerpeopleFirebaseUserStream() =>
    FirebaseAuth.instance
        .authStateChanges()
        .debounce((user) => user == null && !loggedIn
            ? TimerStream(true, const Duration(seconds: 1))
            : Stream.value(user))
        .map<DinnerpeopleFirebaseUser>(
            (user) => currentUser = DinnerpeopleFirebaseUser(user));
