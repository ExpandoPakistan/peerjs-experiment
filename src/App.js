import React, { Component } from 'react';
import Peer from 'peerjs';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      peer: null,
      id: '',
      videoStream: null,
      outGoingCalls: [],
      incomingCalls: [],
      acceptedCalls: [],
      idToConnectTo: '',
    };
  }

  componentDidMount() {
    const peer = new Peer();
    peer.on('open', async (id) => {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: { height: { ideal: 360 } }, audio: false });
      this.setState({ peer, id, videoStream });
    });

    // Fires when receiving a call.
    peer.on('call', (call) => {
      console.log('incoming call');
      console.log(call);
      this.setState({ incomingCalls: [...this.state.incomingCalls, call] });
    });
  }

  componentWillUnmount() {
    this.state.peer.destroy();
  }

  renderIncomingCalls() {
    const { incomingCalls, videoStream } = this.state;
    return (incomingCalls.map(call =>
    (<div key={call.connectionId}>
      <p>Call from: {call.peer}</p>
      <button onClick={(e) => {
        // Accept call
        e.preventDefault();
        call.answer(videoStream);
        call.on('error', (err) => {
          console.error("Call ended in error");
          console.error(err);
        });
        call.on('close', () => {
          console.log("On close was called");
          this.setState({
            acceptedCalls: this.state.acceptedCalls.filter(c => c.connectionId !== call.connectionId)
          });
        });
        call.on('stream', (stream) => {
          this.setState({
            incomingCalls: this.state.incomingCalls.filter(c => c.connectionId !== call.connectionId),
            acceptedCalls: [ ...this.state.acceptedCalls, { stream, connectionId: call.connectionId, peer: call.peer, call  } ]
          });
        });

      }}>Accept</button>
      <button onClick={(e) => {
        // Reject call
        e.preventDefault();
        call.close();
        this.setState({
          incomingCalls: this.state.incomingCalls.filter(c => c.connectionId !== call.connectionId)
        });

      }}>Reject</button>
    </div>)));
  }

  renderAcceptedCalls() {
    const { acceptedCalls } = this.state;
    return (acceptedCalls.map(call =>
    (<div key={call.connectionId}>
      <p>Call with: {call.peer}</p>
      <button onClick={(e) => {
        // End call
        e.preventDefault();
        call.call.close();
      }}>End Call</button>

      <video
        ref={(r) => {
          if(r) {
            r.srcObject = call.stream;
          }
        }}
        playsInline
        muted={true}
        autoPlay>
      </video>
    </div>)));
  }

  render() {
    const { id, peer, idToConnectTo, videoStream } = this.state;
    return (
      <div>
        <div>
          <h1>{id}</h1>
          <input onChange={e => { this.setState({ idToConnectTo: e.target.value }); e.preventDefault(); }} />

          <button onClick={(e) => {
            const call = peer.call(idToConnectTo, videoStream);
            const callCloseHandler = {
              handler: () => {
                console.log("Call was rejected.");
              }
            };
            // The call will either be rejected.
            call.on('close',() => {
              callCloseHandler.handler();
            });
            // Or it will be a success
            call.on('stream', (stream) => {
              callCloseHandler.handler = () => {
                console.log("Call ended gracefully.");
                this.setState({
                  acceptedCalls: this.state.acceptedCalls.filter(c => c.connectionId !== call.connectionId)
                });
              };
              this.setState({
                acceptedCalls: [ ...this.state.acceptedCalls, { peer: idToConnectTo, connectionId: call.connectionId, stream, call } ]
              });
            });
            // Or its going to go into error.
            call.on('error', (err) => {
              console.error('Cloud not place call');
              console.error(err);
            });
            e.preventDefault();
          }}>Connect</button>
        </div>
        <div>
          {this.renderIncomingCalls()}
          {this.renderAcceptedCalls()}
        </div>
      </div>
    );
  }
}

export default App;
