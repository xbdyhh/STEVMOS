import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { NextPage } from 'next';
import {useState,useEffect} from "react";
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import TextField from '@mui/material/TextField';
import List from '@mui/material/List';
import Checkbox from '@mui/material/Checkbox';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import moment from 'moment';


import Abi from "./abi";
import { useAccount, useContractRead, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { fetchBalance } from '@wagmi/core'
import { getAccount } from '@wagmi/core'
import { parseEther,parseUnits,formatEther } from 'viem';
import {bigint} from "zod";




const contractConfig = {
    address: '0xFa3a11f2126667D6d5180848814EE1889008344F',
    abi: Abi,
} as const;

const Home: NextPage = () => {
  const [Mode, setmode] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('');
  const [cbalance, setcBalance] = useState('');
  const [sbalance, setsBalance] = useState('');
  const [expected, setExpected] = useState(0);
  const [NumBalance,setNumBalance] = useState(0)
  const [numcBalance, setNumcBalance] = useState(0);
  const [numsBalance, setNumsBalance] = useState(0);
  const [isOutOfBound,setisOutOfBound] = useState(false)
  const [claimIndex,setclaimIndex] =   useState(0)
  const account = getAccount()
  const { data:sBlance } = useContractRead({
      ...contractConfig,
      functionName: 'balanceOf',
      args: [account.address],
      watch: true,
  });
  const { data:ratio } = useContractRead({
        ...contractConfig,
        functionName: 'getRatio',
        watch: true,
  });
  const {data: RedeemList} = useContractRead({
        ...contractConfig,
        functionName:'getUserRedeemsList',
        args:[account.address],
        watch: true,
  })
  const { config: depositWriteConfig } = usePrepareContractWrite({
      ...contractConfig,
      functionName: 'deposit',
      value: parseEther(amount),
  });
  const { data:cBlance } = useContractRead({
      ...contractConfig,
      functionName: 'deposits',
      args: [account.address],
      watch: true,
  });


  const { config: withdrawContractWriteConfig } = usePrepareContractWrite({
      ...contractConfig,
      functionName: 'withdraw',
      args: [parseEther(amount)],
  });

  const { config: stakeContractWriteConfig } = usePrepareContractWrite({
        ...contractConfig,
        functionName: 'delegate',
        args: [parseEther(amount)],
    });

  const { config: claimContractWriteConfig } = usePrepareContractWrite({
        ...contractConfig,
        functionName: 'redeem',
        args: [claimIndex],
        gas: 10000000,
    });

    const { config: unstakeContractWriteConfig } = usePrepareContractWrite({
        ...contractConfig,
        functionName: 'unbond',
        args: [parseEther(amount)],
        gas: 10000000,
    });


    const {
      write: deposit,
      isLoading: isdepositLoading,
      isSuccess: isdepositStarted,
      error: depositError,
  } = useContractWrite(depositWriteConfig);

  const {
      write: withdraw
  } = useContractWrite(withdrawContractWriteConfig);
  const {
      write: delegate
  } = useContractWrite(stakeContractWriteConfig);

  const {
      write: unbound
  } = useContractWrite(unstakeContractWriteConfig);

  const {
      write: redeem
  } = useContractWrite(claimContractWriteConfig);
  function handleDesposit(){
    return (
        <div>
            <div>
                <TextField  error={isOutOfBound} onChange={(e) => {
                    const val = e.target.value;
                    if (Number(val) > NumBalance-0.05){
                        setisOutOfBound(true)
                    }
                    if (!isNaN(val) && Number(val) > 0 && Number(val) <= NumBalance-0.05) {
                        setisOutOfBound(false)
                        setAmount(val);
                    }
                }} className={styles.textField} variant="filled" helperText={isOutOfBound? "out of bound":balance}>
                </TextField>
            </div>
            <div>
                <Button variant="contained" color="primary" size="large" className={styles.actionButton} onClick={()=>deposit()}>deposit</Button>
            </div>
        </div>
    );
  }
  function handleWithDraw(){
      return (
          <div>
              <div>
                  <TextField  error={isOutOfBound} onChange={(e) => {
                      const val = e.target.value;
                      if (Number(val) > numcBalance){
                          setisOutOfBound(true)
                      }
                      if (!isNaN(val) && Number(val) > 0 && Number(val) <= numcBalance) {
                          setisOutOfBound(false)
                          setAmount(val);
                      }
                  }} className={styles.textField} variant="filled" helperText={isOutOfBound? "out of bound":"You deposit balance:"+cbalance}>
                  </TextField>
              </div>
              <div>
                  <Button variant="contained" color="primary" size="large" className={styles.actionButton} onClick={()=>withdraw()}>withdraw</Button>
              </div>
          </div>
      );
  }
  function handleDelegate(){
      return (
          <div>
              <div>
                  <TextField  error={isOutOfBound} onChange={(e) => {
                      const val = e.target.value;
                      if (Number(val) > numcBalance){
                          setisOutOfBound(true)
                      }
                      if (!isNaN(val) && Number(val) > 0 && Number(val) <= numcBalance) {
                          setisOutOfBound(false)
                          setAmount(val);
                      }
                  }} className={styles.textField} variant="filled" helperText={isOutOfBound? "out of bound":"You deposit balance:"+cbalance}>
                  </TextField>
              </div>
              <div>
                  <Button variant="contained" color="primary" size="large" className={styles.actionButton} onClick={()=>delegate()}>delegate</Button>
              </div>
          </div>
      );
  }
  function handleUnbond(){
      return (
          <div>
              <div>
                  <p>expect got {expected} evmos!!!</p>
                  <TextField  error={isOutOfBound} onChange={(e) => {
                      const val = e.target.value;
                      if (Number(val) > numcBalance){
                          setisOutOfBound(true)
                      }
                      if (!isNaN(val) && Number(val) > 0 && Number(val) <= numsBalance) {
                          setisOutOfBound(false)
                          setAmount(val);
                          console.log(ratio)
                          setExpected(Number(val) * parseFloat(formatEther(ratio.toString(),"wei")));
                      }
                  }} className={styles.textField} variant="filled" helperText={isOutOfBound? "out of bound":"You StEvmos balance:"+sbalance}>
                  </TextField>
              </div>
              <div>
                  <Button variant="contained" color="primary" size="large" className={styles.actionButton} onClick={()=>unbound()}>Unbound</Button>
              </div>
          </div>
      );
  }
  function handleClaim(){
    const listItems = RedeemList.map((redeemItem, index) =>
        <ListItem
            key={index}
        >
            <ListItemButton onClick={()=>{setclaimIndex(index)}}>
                <ListItemText id={index} primary={index+": "+`evmos:`+ formatEther(redeemItem.EvmosAmount.toString(), "wei")+ " "+ "claim time:"
                + moment(Number(redeemItem.completionTime)*1000).format()} />
            </ListItemButton>
        </ListItem>
    );
    return (
        <div>

            <list dense className ={styles.list}>
                {listItems}
            </list>
            <Button variant="contained" color="primary" size="large" className={styles.actionButton} onClick={()=>redeem()}>Claim {claimIndex}</Button>
        </div>
    );
  }


  useEffect(() => {
      if (account.status === 'connected') {
          fetchBalance({ address: account.address, formatUnits: 'ether', })
              .then((balance) => {
                  console.log(balance);
                  setBalance(balance.formatted + ' ' + balance.symbol);
                  setNumBalance(parseFloat(balance.formatted));
              })
              .catch((error) => {
                  console.error(error);
              });
      }
  }, [account]);
  useEffect(() => {
      if (cBlance) {
          setcBalance(formatEther(cBlance.toString(),"wei") + ' ' + "tEVMOS");
          setNumcBalance(parseFloat(formatEther(cBlance.toString(),"wei")));
      }
  }, [cBlance]);
  useEffect(() => {
      if (sBlance) {
          setsBalance(formatEther(sBlance.toString(),"wei") + ' ' + "stEVMOS");
          setNumsBalance(parseFloat(formatEther(sBlance.toString(),"wei")));
          console.log(sBlance.toString());
      }
  }, [sBlance]);



    return (
    <div className={styles.container}>
      <div className={styles.connectButton}>
        <ConnectButton />
      </div>
      <Head>
        <title>Liquid Stake Evmos</title>
        <link href="/favicon.ico" rel="icon" />
      </Head>
      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to Liquid Stake Evmos
        </h1>

        <ButtonGroup variant="outlined" color="warning" size="large" aria-label="outlined primary button group">
          <Button onClick={()=>{setmode('deposit')}}>deposit</Button>
          <Button onClick={()=>{setmode('withdraw')}}>withdraw</Button>
          <Button onClick={()=>{setmode('delegate')}}>delegate</Button>
          <Button onClick={()=>{setmode('unbound')}}>unbound</Button>
          <Button onClick={()=>{setmode('Claim')}}>Claim</Button>
        </ButtonGroup>
        <div className={styles.space}></div>
        <div className={styles.grid}>
          {Mode === 'deposit'
                ? handleDesposit()
                :Mode === 'withdraw'
                ?handleWithDraw()
                :Mode === 'delegate'
                ?handleDelegate()
                :Mode === 'unbound'
                ?handleUnbond()
                :Mode === 'Claim'
                ?handleClaim():
                <div>notfound</div>}

        </div>
      </main>

      <footer className={styles.footer}>
        <a href="https://rainbow.me" rel="noopener noreferrer" target="_blank">
          Made with ❤️ by your frens at 🌈
        </a>
      </footer>
    </div>
  );
};

export default Home;
